using YeniYeniCayOcagiYonetimi.Data;
using YeniYeniCayOcagiYonetimi.Models;
using YeniYeniCayOcagiYonetimi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace YeniYeniCayOcagiYonetimi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IUserService _userService;

        public OrdersController(ApplicationDbContext context, IUserService userService)
        {
            _context = context;
            _userService = userService;
        }

        // T�m Sipari�leri Listele (GET: api/orders)
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public IActionResult GetOrders()
        {
            var orders = _context.Orders
                .Include(o => o.User)
                .ToList();
            return Ok(orders);
        }

        // Belirli Bir Sipari�i Getir (GET: api/orders/{id})
        [HttpGet("{id}")]
        public IActionResult GetOrder(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var order = _context.Orders
                .Include(o => o.User)
                .FirstOrDefault(o => o.id == id);

            if (order == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�i de�ilse eri�imi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            var orderDrinks = _context.OrderDrinks.Where(od => od.orderid == id).ToList();
            return Ok(new { order, orderDrinks });
        }

        // Yeni Sipari� Olu�tur (POST: api/orders)
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] Order order)
        {
            // JSON olarak gelen verileri logla
            Console.WriteLine($"[DEBUG LOG] Gelen sipari� JSON: {JsonSerializer.Serialize(order)}");
            
            using var transaction = await _context.Database.BeginTransactionAsync();
            // T�rk�e a��klama: Model do�rulama
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // T�rk�e a��klama: Giri� yapan kullan�c�n�n ID'sini al
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            // T�rk�e a��klama: Kullan�c�y� veritaban�ndan bul
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "Kullan�c� bulunamad�" });

            // T�rk�e a��klama: Sipari� i�eceklerini ve fiyatlar�n� getir
            var orderDrinks = order.OrderDrinks?.ToList() ?? new List<OrderDrink>();
            Console.WriteLine($"[DEBUG LOG] orderDrinks say�s�: {orderDrinks.Count}");
            foreach (var od in orderDrinks)
            {
                Console.WriteLine($"[DEBUG LOG] ��ecek: beverageid={od.beverageid}, piece={od.piece}");
            }

            // Sipari�i olu�tur
            order.Status = OrderStatus.Pending;
            order.UserId = userId;
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            foreach (var od in orderDrinks)
            {
                od.orderid = order.id;
            }
            _context.OrderDrinks.AddRange(orderDrinks);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            // T�rk�e a��klama: Sipari� ba�ar�yla olu�turuldu, g�ncel fi� say�s� ile d�n
            return CreatedAtAction(nameof(GetOrder), new { id = order.id }, new { order, updatedTicketCount = user.TicketCount });
        }

        // Mevcut Sipari�i G�ncelle (PUT: api/orders/{id})
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, [FromBody] Order order)
        {
            if (id != order.id)
                return BadRequest();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrder = await _context.Orders.FindAsync(id);
            if (existingOrder == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�i de�ilse eri�imi engelle
            if (userRole != "Admin" && existingOrder.UserId != userId)
                return Forbid();

            existingOrder.notes = order.notes;
            existingOrder.roomid = order.roomid;

            // Sadece admin sipari� durumunu de�i�tirebilir
            if (userRole == "Admin")
            {
                var oldStatus = existingOrder.Status;
                existingOrder.Status = order.Status;

                // E�er sipari� reddedildiyse fi� say�s�n� iade et
                if (oldStatus == OrderStatus.Pending && order.Status == OrderStatus.Rejected)
                {
                    if (existingOrder.UserId.HasValue)
                    {
                        var user = await _context.Users.FindAsync(existingOrder.UserId.Value);
                        if (user != null)
                        {
                            // Sipari� i�eceklerini ve fiyatlar�n� getir
                            var orderDrinks = await _context.OrderDrinks
                                .Include(od => od.BeverageNavigation)
                                .Where(od => od.orderid == existingOrder.id)
                                .ToListAsync();

                            int toplamFis = 0;
                            foreach (var od in orderDrinks)
                            {
                                if (od.BeverageNavigation?.price != null)
                                {
                                    toplamFis += od.piece * od.BeverageNavigation.price.Value;
                                }
                            }

                            // Fi� say�s�n� iade et
                            user.TicketCount += toplamFis;
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> PatchOrder(int id, [FromBody] Order order)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrder = await _context.Orders.FindAsync(id);
            if (existingOrder == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�i de�ilse eri�imi engelle
            if (userRole != "Admin" && existingOrder.UserId != userId)
                return Forbid();

            // Not ve oda g�ncellemesi
            if (!string.IsNullOrEmpty(order.notes))
                existingOrder.notes = order.notes;

            if (order.roomid != 0)
                existingOrder.roomid = order.roomid;

            // Status g�ncellemesi (sadece admin i�in)
            if (userRole == "Admin" && order.Status != existingOrder.Status)
            {
                var oldStatus = existingOrder.Status;

                Console.WriteLine($"Sipari� durumu de�i�tiriliyor - Sipari� ID: {id}, Eski Durum: {oldStatus}, Yeni Durum: {order.Status}");

                // Sadece bekleyen sipari�lerin durumu de�i�tirilebilir
                if (existingOrder.Status != OrderStatus.Pending)
                {
                    return BadRequest("Sadece bekleyen sipari�lerin durumu de�i�tirilebilir.");
                }

                // Status sadece Approved veya Rejected olabilir
                if (order.Status != OrderStatus.Approved && order.Status != OrderStatus.Rejected)
                {
                    return BadRequest("Ge�ersiz sipari� durumu.");
                }

                existingOrder.Status = order.Status;

                // E�er sipari� reddedildiyse fi� say�s�n� iade et
                if (oldStatus == OrderStatus.Pending && order.Status == OrderStatus.Rejected)
                {
                    if (existingOrder.UserId.HasValue)
                    {
                        var user = await _context.Users.FindAsync(existingOrder.UserId.Value);
                        if (user != null)
                        {
                            // Sipari� i�eceklerini ve fiyatlar�n� getir
                            var orderDrinks = await _context.OrderDrinks
                                .Include(od => od.BeverageNavigation)
                                .Where(od => od.orderid == existingOrder.id)
                                .ToListAsync();

                            int toplamFis = 0;
                            foreach (var od in orderDrinks)
                            {
                                if (od.BeverageNavigation?.price != null)
                                {
                                    toplamFis += od.piece * od.BeverageNavigation.price.Value;
                                }
                            }

                            Console.WriteLine($"Sipari� reddedildi - Kullan�c� ID: {existingOrder.UserId}, Mevcut Fi�: {user.TicketCount}, �ade Edilecek Fi�: {toplamFis}");

                            // Fi� say�s�n� iade et
                            user.TicketCount += toplamFis;
                            _context.Users.Update(user);
                            await _context.SaveChangesAsync();

                            Console.WriteLine($"Fi� iade edildi - Kullan�c� ID: {existingOrder.UserId}, Yeni Fi�: {user.TicketCount}");
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(existingOrder);
        }

        // Sipari�i Sil (DELETE: api/orders/{id})
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var order = await _context.Orders.FindAsync(id);
            if (order == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�i de�ilse eri�imi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            // Sadece bekleyen sipari�ler silinebilir
            if (order.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen sipari�ler silinebilir.");

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Tamamlanan sipari�leri getirme metodu
        [HttpGet("completed")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<Order>>> GetCompletedOrders()
        {
            return await _context.Orders
                .Include(o => o.User)
                .Where(o => o.Status == OrderStatus.Approved || o.Status == OrderStatus.Rejected)
                .ToListAsync();
        }

        // Bekleyen sipari�leri getirme metodu
        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingOrders()
        {
            try
            {
                // Kullan�c� bilgilerini kontrol et
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRole != "Admin")
                {
                    return Forbid();
                }

                // Bekleyen sipari�leri getir
                var orders = await _context.Orders
                    .Include(o => o.User)
                    .Include(o => o.OrderDrinks)
                        .ThenInclude(od => od.BeverageNavigation)
                    .Where(o => o.Status == OrderStatus.Pending)
                    .Select(o => new
                    {
                        o.id,
                        o.notes,
                        o.roomid,
                        o.Status,
                        User = o.User == null ? null : new
                        {
                            o.User.Id,
                            o.User.Username,
                            o.User.Role,
                            o.User.TicketCount
                        },
                        OrderDrinks = o.OrderDrinks.Select(od => new
                        {
                            od.id,
                            od.piece,
                            Beverage = od.BeverageNavigation == null ? null : new
                            {
                                id = od.BeverageNavigation.id,
                                name = od.BeverageNavigation.name,
                                price = od.BeverageNavigation.price
                            }
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = orders,
                    count = orders.Count
                });
            }
            catch (Exception ex)
            {
                // Hata loglamas�
                return StatusCode(500, new
                {
                    success = false,
                    error = "Bekleyen sipari�ler al�n�rken bir hata olu�tu",
                    details = ex.Message
                });
            }
        }

        // Kullan�c�n�n kendi sipari�lerini getirme metodu
        [HttpGet("my-orders")]
        public async Task<ActionResult<IEnumerable<Order>>> GetMyOrders()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            return await _context.Orders
                .Where(o => o.UserId == userId)
                .ToListAsync();
        }

        // T�m Sipari�leri Sil (DELETE: api/orders/all)
        [HttpDelete("all")]
        [Authorize(Roles = "Admin")]
        public IActionResult DeleteAllOrders()
        {
            try
            {
                // �nce ili�kili OrderDrinks kay�tlar�n� sil
                var orderDrinks = _context.OrderDrinks.ToList();
                _context.OrderDrinks.RemoveRange(orderDrinks);

                // Sonra t�m sipari�leri sil
                var orders = _context.Orders.ToList();
                _context.Orders.RemoveRange(orders);
                
                _context.SaveChanges();

                return Ok("T�m sipari�ler ba�ar�yla silindi.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Sipari�ler silinirken bir hata olu�tu: {ex.Message}");
            }
        }
    }
}

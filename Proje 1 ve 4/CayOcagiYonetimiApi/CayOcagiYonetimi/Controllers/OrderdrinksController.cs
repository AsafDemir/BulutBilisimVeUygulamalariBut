using YeniYeniCayOcagiYonetimi.Data;
using YeniYeniCayOcagiYonetimi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace YeniYeniCayOcagiYonetimi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrderdrinksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public OrderdrinksController(ApplicationDbContext context)
        {
            _context = context;
        }

        // T�m Sipari� ��eceklerini Listele (GET: api/orderdrinks)
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOrderDrinks()
        {
            var orderDrinks = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .ToListAsync();
            return Ok(orderDrinks);
        }

        // Belirli Bir Sipari� ��ece�ini Getir (GET: api/orderdrinks/{id})
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderDrink(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var orderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (orderDrink == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�ine ait de�ilse eri�imi engelle
            if (userRole != "Admin" && orderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            return Ok(orderDrink);
        }

        // Yeni Sipari� ��ece�i Ekle (POST: api/orderdrinks)
        [HttpPost]
        public async Task<IActionResult> CreateOrderDrink([FromBody] OrderDrink orderDrink)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Sipari�in varl���n� ve kullan�c�ya ait oldu�unu kontrol et
            var order = await _context.Orders.FindAsync(orderDrink.orderid);
            if (order == null)
                return BadRequest("Ge�ersiz sipari� ID'si");

            // Admin de�ilse ve kendi sipari�i de�ilse eri�imi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            // Sipari� beklemede de�ilse i�ecek eklenemez
            if (order.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen sipari�lere i�ecek eklenebilir.");

            // ��ece�in aktif oldu�unu kontrol et
            var beverage = await _context.Beverages.FindAsync(orderDrink.beverageid);
            if (beverage == null || !beverage.active.GetValueOrDefault())
                return BadRequest(new { message = "Bu i�ecek aktif de�il veya mevcut de�il, sipari� veremezsiniz." });

            // ��ecek fiyat� ve fi� d���rme i�in kullan�c� bilgilerini al
            var user = await _context.Users.FindAsync(order.UserId.Value);
            if (user == null)
                return BadRequest("Kullan�c� bulunamad�");

            // ��ecek fiyat� kadar fi� d���r
            int dusurelecekFis = beverage.price.GetValueOrDefault() * orderDrink.piece;
            Console.WriteLine($"[F�� LOG] ��ecek ekleniyor - Sipari� ID: {orderDrink.orderid}, ��ecek Fiyat�: {beverage.price}, Adet: {orderDrink.piece}, D���lecek Fi�: {dusurelecekFis}");

            // Kullan�c�n�n yeterli fi�i var m� kontrol et
            if (user.TicketCount < dusurelecekFis)
            {
                Console.WriteLine($"[F�� LOG] Yetersiz fi� bakiyesi! Kullan�c� ID: {user.Id}, Mevcut: {user.TicketCount}, Gerekli: {dusurelecekFis}");
                return BadRequest(new { message = "Yetersiz fi� bakiyesi" });
            }

            // Fi� say�s�n� d���r
            user.TicketCount -= dusurelecekFis;
            _context.Entry(user).State = EntityState.Modified;

            _context.OrderDrinks.Add(orderDrink);
            await _context.SaveChangesAsync();

            Console.WriteLine($"[F�� LOG] ��ecek eklendi, fi� d���r�ld� - Kullan�c� ID: {user.Id}, Yeni Fi�: {user.TicketCount}");

            return CreatedAtAction(nameof(GetOrderDrink), new { id = orderDrink.id }, new { orderDrink, updatedTicketCount = user.TicketCount });
        }

        // Mevcut Sipari� ��ece�ini G�ncelle (PUT: api/orderdrinks/{id})
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrderDrink(int id, [FromBody] OrderDrink orderDrink)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .Include(od => od.BeverageNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (existingOrderDrink == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�ine ait de�ilse eri�imi engelle
            if (userRole != "Admin" && existingOrderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            // Sipari� beklemede de�ilse g�ncellenemez
            if (existingOrderDrink.OrderNavigation?.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen sipari�lerdeki i�ecekler g�ncellenebilir.");

            // Kullan�c�y� bul
            var user = await _context.Users.FindAsync(existingOrderDrink.OrderNavigation.UserId);
            if (user == null)
                return BadRequest("Kullan�c� bulunamad�");

            // Mevcut fi� de�erini geri ekle
            int eskiFisDegeri = existingOrderDrink.piece * (existingOrderDrink.BeverageNavigation?.price ?? 0);
            user.TicketCount += eskiFisDegeri;

            // Yeni i�ecek bilgilerini g�ncelle
            var newBeverageId = orderDrink.beverageid != 0 ? orderDrink.beverageid : existingOrderDrink.beverageid;
            var newPiece = orderDrink.piece > 0 ? orderDrink.piece : existingOrderDrink.piece;

            // Yeni i�ece�in fiyat�n� al
            var newBeverage = await _context.Beverages.FindAsync(newBeverageId);
            if (newBeverage == null || !newBeverage.active.GetValueOrDefault())
                return BadRequest("Ge�ersiz veya aktif olmayan i�ecek.");

            // Yeni fi� de�erini hesapla
            int yeniFisDegeri = newPiece * (newBeverage.price ?? 0);

            Console.WriteLine($"[F�� LOG] ��ecek g�ncelleniyor - Eski Fi�: {eskiFisDegeri}, Yeni Fi�: {yeniFisDegeri}");

            // Yeterli fi� var m� kontrol et
            if (user.TicketCount < yeniFisDegeri)
            {
                Console.WriteLine($"[F�� LOG] Yetersiz fi� bakiyesi! Kullan�c� ID: {user.Id}, Mevcut: {user.TicketCount}, Gerekli: {yeniFisDegeri}");
                return BadRequest(new { message = "Yetersiz fi� bakiyesi" });
            }

            // Fi� say�s�n� d���r
            user.TicketCount -= yeniFisDegeri;
            _context.Entry(user).State = EntityState.Modified;

            // ��ecek bilgilerini g�ncelle
            if (orderDrink.beverageid != 0)
                existingOrderDrink.beverageid = orderDrink.beverageid;

            if (orderDrink.piece > 0)
                existingOrderDrink.piece = orderDrink.piece;

            await _context.SaveChangesAsync();

            Console.WriteLine($"[F�� LOG] ��ecek g�ncellendi, fi� d���r�ld� - Kullan�c� ID: {user.Id}, Yeni Fi�: {user.TicketCount}");

            return Ok(new { orderDrink = existingOrderDrink, updatedTicketCount = user.TicketCount });
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> PatchOrderDrink(int id, [FromBody] OrderDrink orderDrink)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (existingOrderDrink == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�ine ait de�ilse eri�imi engelle
            if (userRole != "Admin" && existingOrderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            // Sipari� beklemede de�ilse g�ncellenemez
            if (existingOrderDrink.OrderNavigation?.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen sipari�lerdeki i�ecekler g�ncellenebilir.");

            if (orderDrink.beverageid != 0)
            {
                // ��ece�in aktif oldu�unu kontrol et
                var beverage = await _context.Beverages.FindAsync(orderDrink.beverageid);
                if (beverage == null || !beverage.active.GetValueOrDefault())
                    return BadRequest("Ge�ersiz veya aktif olmayan i�ecek.");

                existingOrderDrink.beverageid = orderDrink.beverageid;
            }

            if (orderDrink.piece > 0)
                existingOrderDrink.piece = orderDrink.piece;

            await _context.SaveChangesAsync();
            return Ok(existingOrderDrink);
        }

        // Sipari� ��ece�ini Sil (DELETE: api/orderdrinks/{id})
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrderDrink(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var orderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .Include(od => od.BeverageNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (orderDrink == null)
                return NotFound();

            // Admin de�ilse ve kendi sipari�ine ait de�ilse eri�imi engelle
            if (userRole != "Admin" && orderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            // Sipari� beklemede de�ilse i�ecek silinemez
            if (orderDrink.OrderNavigation?.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen sipari�lerden i�ecek silinebilir.");

            // Kullan�c�y� bul
            var user = await _context.Users.FindAsync(orderDrink.OrderNavigation.UserId);
            if (user == null)
                return BadRequest("Kullan�c� bulunamad�");

            // Fi� de�erini hesapla ve iade et
            int iadeFisDegeri = orderDrink.piece * (orderDrink.BeverageNavigation?.price ?? 0);
            
            Console.WriteLine($"[F�� LOG] ��ecek siliniyor - �ade edilecek fi�: {iadeFisDegeri}");
            
            // Fi� iade et
            user.TicketCount += iadeFisDegeri;
            _context.Entry(user).State = EntityState.Modified;

            _context.OrderDrinks.Remove(orderDrink);
            await _context.SaveChangesAsync();

            Console.WriteLine($"[F�� LOG] ��ecek silindi, fi� iade edildi - Kullan�c� ID: {user.Id}, Yeni Fi�: {user.TicketCount}");

            return Ok(new { message = "��ecek silindi", updatedTicketCount = user.TicketCount });
        }

        // Belirli bir sipari�e ait i�ecekleri getir
        [HttpGet("by-order/{orderId}")]
        public async Task<IActionResult> GetOrderDrinksByOrder(int orderId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                return NotFound("Sipari� bulunamad�.");

            // Admin de�ilse ve kendi sipari�i de�ilse eri�imi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            var orderDrinks = await _context.OrderDrinks
                .Where(od => od.orderid == orderId)
                .Include(od => od.OrderNavigation)
                .Include(od => od.BeverageNavigation)
                .ToListAsync();

            return Ok(orderDrinks);
        }
    }
}

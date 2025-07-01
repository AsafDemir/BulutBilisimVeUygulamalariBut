using YeniYeniCayOcagiYonetimi.Data;
using YeniYeniCayOcagiYonetimi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace YeniYeniCayOcagiYonetimi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RoomsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // T�m Odalar� Listele (GET: api/rooms)
        [HttpGet]
        public async Task<IActionResult> GetRooms()
        {
            var rooms = await _context.Rooms.ToListAsync();
            return Ok(rooms);
        }

        // Belirli Bir Oday� Getir (GET: api/rooms/{id})
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRoom(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
                return NotFound();

            return Ok(room);
        }

        // Yeni Oda Ekle (POST: api/rooms)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateRoom([FromBody] Room room)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoom), new { id = room.id }, room);
        }

        // Mevcut Oday� G�ncelle (PUT: api/rooms/{id})
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRoom(int id, [FromBody] Room room)
        {
            if (id != room.id)
                return BadRequest();

            var existingRoom = await _context.Rooms.FindAsync(id);
            if (existingRoom == null)
                return NotFound();

            existingRoom.name = room.name;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("{id}")]
        public IActionResult PatchRoom(int id, [FromBody] Room room)
        {
            var existingRoom = _context.Rooms.Find(id);
            if (existingRoom == null)
                return NotFound();

            // G�ncellenen alan
            if (!string.IsNullOrEmpty(room.name))
                existingRoom.name = room.name;

            _context.SaveChanges();

            return Ok(existingRoom);
        }

        // Oday� Sil (DELETE: api/rooms/{id})
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
                return NotFound();

            // Odaya ait aktif sipari� var m� kontrol et
            var hasActiveOrders = await _context.Orders
                .AnyAsync(o => o.roomid == id && o.Status == OrderStatus.Pending);

            if (hasActiveOrders)
                return BadRequest("Bu odaya ait aktif sipari�ler bulundu�u i�in silinemez.");

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

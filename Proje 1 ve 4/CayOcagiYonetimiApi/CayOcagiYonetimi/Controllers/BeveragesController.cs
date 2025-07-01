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
    [Authorize]
    public class BeveragesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public BeveragesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // T�m ��ecekleri Listele (GET: api/beverages)
        [HttpGet]
        public async Task<IActionResult> GetBeverages()
        {
            var beverages = await _context.Beverages
                .Where(b => b.active == true) // Sadece aktif i�ecekleri getir
                .ToListAsync();
            return Ok(beverages);
        }

        // T�m ��ecekleri (Aktif ve Pasif) Listele (GET: api/beverages/with-inactive)
        [HttpGet("with-inactive")]
        public async Task<IActionResult> GetBeveragesWithInactive()
        {
            var beverages = await _context.Beverages
                .Select(b => new
                {
                    b.id,
                    b.name,
                    b.price,
                    b.pics,
                    b.active,
                    canOrder = b.active == true // Sipari� verilebilir mi?
                })
                .ToListAsync();
            return Ok(beverages);
        }

        // T�m ��ecekleri Listele (Admin i�in) (GET: api/beverages/all)
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllBeverages()
        {
            var beverages = await _context.Beverages.ToListAsync();
            return Ok(beverages);
        }

        // Belirli Bir ��ece�i Getir (GET: api/beverages/{id})
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBeverage(int id)
        {
            var beverage = await _context.Beverages.FindAsync(id);
            if (beverage == null)
                return NotFound();

            // E�er i�ecek aktif de�ilse ve kullan�c� admin de�ilse g�r�nt�lemeyi engelle
            if (!beverage.active.GetValueOrDefault() && !User.IsInRole("Admin"))
                return NotFound();

            return Ok(beverage);
        }

        // Yeni ��ecek Ekle (POST: api/beverages)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateBeverage([FromBody] Beverage beverage)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Beverages.Add(beverage);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBeverage), new { id = beverage.id }, beverage);
        }

        // Mevcut ��ece�i G�ncelle (PUT: api/beverages/{id})
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateBeverage(int id, [FromBody] Beverage beverage)
        {
            if (id != beverage.id)
                return BadRequest();

            var existingBeverage = await _context.Beverages.FindAsync(id);
            if (existingBeverage == null)
                return NotFound();

            existingBeverage.name = beverage.name;
            existingBeverage.price = beverage.price;
            existingBeverage.active = beverage.active;
            existingBeverage.pics = beverage.pics;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ��ece�i Aktif/Pasif Yap (PATCH: api/beverages/{id}/toggle-active)
        [HttpPatch("{id}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleBeverageActive(int id)
        {
            var beverage = await _context.Beverages.FindAsync(id);
            if (beverage == null)
                return NotFound();

            beverage.active = !beverage.active;
            await _context.SaveChangesAsync();

            return Ok(new { active = beverage.active });
        }

        // ��ecek Sil (DELETE: api/beverages/{id})
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBeverage(int id)
        {
            var beverage = await _context.Beverages.FindAsync(id);
            if (beverage == null)
                return NotFound();

            _context.Beverages.Remove(beverage);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

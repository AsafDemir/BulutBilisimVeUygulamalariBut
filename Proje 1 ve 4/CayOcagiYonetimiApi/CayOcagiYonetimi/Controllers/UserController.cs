using YeniYeniCayOcagiYonetimi.Models.DTOs;
using YeniYeniCayOcagiYonetimi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace YeniYeniCayOcagiYonetimi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<UserDto>>> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUser(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPut("ticket-count")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTicketCount([FromBody] UpdateTicketCountDto dto)
        {
            var result = await _userService.UpdateTicketCountAsync(dto.UserId, dto.NewTicketCount);
            if (!result)
                return NotFound();

            return Ok(new { message = "Fiş sayısı güncellendi" });
        }

        [HttpPost("{id}/deactivate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivateUser(int id)
        {
            var result = await _userService.DeactivateUserAsync(id);
            if (!result)
                return NotFound();

            return Ok("Kullanıcı deaktif edildi");
        }

        [HttpPost("{id}/activate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ActivateUser(int id)
        {
            var result = await _userService.ActivateUserAsync(id);
            if (!result)
                return NotFound();

            return Ok("Kullanıcı aktif edildi");
        }

        [HttpGet("{id}/ticket-count")]
        public async Task<ActionResult<int>> GetTicketCount(int id)
        {
            var ticketCount = await _userService.GetUserTicketCountAsync(id);
            return Ok(ticketCount);
        }
    }
} 

using YeniYeniCayOcagiYonetimi.Models.DTOs;
using YeniYeniCayOcagiYonetimi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace YeniYeniCayOcagiYonetimi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            var (success, token) = await _authService.LoginAsync(loginDto);
            if (!success)
            {
                return Unauthorized("Geçersiz kullanıcı adı veya şifre");
            }

            return Ok(new { token });
        }

        [HttpPost("register")]
        [AllowAnonymous] // İlk admin kullanıcısını oluşturduktan sonra [Authorize(Roles = "Admin")] yapacağız
        public async Task<IActionResult> Register([FromBody] CreateUserDto userDto)
        {
            var result = await _authService.RegisterAsync(userDto);
            if (!result)
            {
                return BadRequest("Kullanıcı adı zaten kullanımda");
            }

            return Ok("Kullanıcı başarıyla oluşturuldu");
        }
    }
} 

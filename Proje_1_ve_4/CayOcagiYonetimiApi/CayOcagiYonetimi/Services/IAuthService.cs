using YeniYeniCayOcagiYonetimi.Models;
using YeniYeniCayOcagiYonetimi.Models.DTOs;

namespace YeniYeniCayOcagiYonetimi.Services
{
    public interface IAuthService
    {
        Task<(bool success, string token)> LoginAsync(LoginDto loginDto);
        Task<bool> RegisterAsync(CreateUserDto userDto);
        string GenerateJwtToken(User user);
        string HashPassword(string password);
        bool VerifyPassword(string password, string passwordHash);
    }
} 

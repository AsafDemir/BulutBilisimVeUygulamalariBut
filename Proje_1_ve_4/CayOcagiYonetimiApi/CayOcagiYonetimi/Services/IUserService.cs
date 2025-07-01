using YeniYeniCayOcagiYonetimi.Models;
using YeniYeniCayOcagiYonetimi.Models.DTOs;

namespace YeniYeniCayOcagiYonetimi.Services
{
    public interface IUserService
    {
        Task<List<UserDto>> GetAllUsersAsync();
        Task<UserDto?> GetUserByIdAsync(int id);
        Task<bool> UpdateTicketCountAsync(int userId, int newTicketCount);
        Task<bool> DeactivateUserAsync(int userId);
        Task<bool> ActivateUserAsync(int userId);
        Task<int> GetUserTicketCountAsync(int userId);
        Task<bool> DecrementTicketCountAsync(int userId);
    }
} 

using YeniYeniCayOcagiYonetimi.Data;
using YeniYeniCayOcagiYonetimi.Models;
using YeniYeniCayOcagiYonetimi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace YeniYeniCayOcagiYonetimi.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;

        public UserService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            return await _context.Users
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Role = u.Role,
                    TicketCount = u.TicketCount,
                    IsActive = u.IsActive
                })
                .ToListAsync();
        }

        public async Task<UserDto?> GetUserByIdAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return null;

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Role = user.Role,
                TicketCount = user.TicketCount,
                IsActive = user.IsActive
            };
        }

        public async Task<bool> UpdateTicketCountAsync(int userId, int newTicketCount)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.TicketCount = newTicketCount;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeactivateUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ActivateUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.IsActive = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> GetUserTicketCountAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.TicketCount ?? 0;
        }

        public async Task<bool> DecrementTicketCountAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.TicketCount <= 0) return false;

            user.TicketCount--;
            await _context.SaveChangesAsync();
            return true;
        }
    }
} 

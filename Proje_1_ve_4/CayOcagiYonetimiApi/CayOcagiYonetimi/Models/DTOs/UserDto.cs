using System.ComponentModel.DataAnnotations;

namespace YeniYeniCayOcagiYonetimi.Models.DTOs
{
    public class UserDto
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;

        public UserRole Role { get; set; }
        
        public int TicketCount { get; set; }
        
        public bool IsActive { get; set; }
    }

    public class CreateUserDto
    {
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        public UserRole Role { get; set; }
        
        public int TicketCount { get; set; }
    }

    public class UpdateTicketCountDto
    {
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public int NewTicketCount { get; set; }
    }
} 

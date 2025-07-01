using System.ComponentModel.DataAnnotations;

namespace YeniYeniCayOcagiYonetimi.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public UserRole Role { get; set; }

        public int TicketCount { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation property
        public virtual ICollection<Order>? Orders { get; set; }
    }
} 
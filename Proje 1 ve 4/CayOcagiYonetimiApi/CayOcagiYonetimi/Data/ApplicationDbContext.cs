using YeniYeniCayOcagiYonetimi.Models;
using Microsoft.EntityFrameworkCore;

namespace YeniYeniCayOcagiYonetimi.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Beverage> Beverages { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDrink> OrderDrinks { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User - Order ilişkisi (nullable)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // OrderDrink - Order ilişkisi
            modelBuilder.Entity<OrderDrink>()
                .HasOne(od => od.OrderNavigation)
                .WithMany(o => o.OrderDrinks)
                .HasForeignKey(od => od.orderid)
                .OnDelete(DeleteBehavior.Restrict);

            // OrderDrink - Beverage ilişkisi
            modelBuilder.Entity<OrderDrink>()
                .HasOne(od => od.BeverageNavigation)
                .WithMany()
                .HasForeignKey(od => od.beverageid)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}

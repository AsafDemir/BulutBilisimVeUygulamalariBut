namespace YeniYeniCayOcagiYonetimi.Models
{
    public class Order
    {
        public int id { get; set; }
        public string? notes { get; set; }
        public int roomid { get; set; }
        public OrderStatus Status { get; set; } = OrderStatus.Pending;
        
        // User ili�kisi i�in yeni alanlar - nullable olarak tan�mland�
        public int? UserId { get; set; }
        public virtual User? User { get; set; }

        // OrderDrinks navigation property'si
        public virtual ICollection<OrderDrink> OrderDrinks { get; set; } = new List<OrderDrink>();
    }
}

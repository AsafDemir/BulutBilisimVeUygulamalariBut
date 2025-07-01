namespace YeniYeniCayOcagiYonetimi.Models
{
    public class OrderDrink
    {
        public int id { get; set; }
        public int orderid { get; set; }
        public int beverageid { get; set; }
        public int piece { get; set; }

        // Navigation properties
        public virtual Order? OrderNavigation { get; set; }
        public virtual Beverage? BeverageNavigation { get; set; }
    }
}

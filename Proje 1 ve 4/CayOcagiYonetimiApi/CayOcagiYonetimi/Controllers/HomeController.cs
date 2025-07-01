using Microsoft.AspNetCore.Mvc;

namespace CayOcagiYonetimi.Controllers
{
    [ApiController]
    [Route("")]
    public class HomeController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new 
            { 
                status = "Çay Ocağı Yönetimi API çalışıyor",
                message = "API erişilebilir durumdadır",
                version = "1.0",
                timestamp = DateTime.UtcNow 
            });
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new 
            { 
                status = "healthy", 
                uptime = Environment.TickCount / 1000.0, 
                timestamp = DateTime.UtcNow 
            });
        }
    }
} 
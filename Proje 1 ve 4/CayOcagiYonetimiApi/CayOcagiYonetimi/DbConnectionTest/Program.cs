using System;
using System.Threading.Tasks;
using Npgsql;
namespace DbConnectionTest {
    class Program {
        static async Task Main() {
            string connString = "Server=cayocagiyonetimi.postgres.database.azure.com;Database=postgres;Port=5432;User Id=postgre;Password=Galata29;Ssl Mode=Require;";
            Console.WriteLine("Trying to connect to PostgreSQL...");
            try {
                using var conn = new NpgsqlConnection(connString);
                await conn.OpenAsync();
                Console.WriteLine("Connection successful!");
                using var cmd = new NpgsqlCommand("SELECT 1;", conn);
                var result = await cmd.ExecuteScalarAsync();
                Console.WriteLine($"Query result: {result}");
            } catch (Exception ex) {
                Console.WriteLine($"Connection error: {ex.Message}");
                var innerEx = ex.InnerException;
                while (innerEx != null) {
                    Console.WriteLine($"Inner error: {innerEx.Message}");
                    innerEx = innerEx.InnerException;
                }
            }
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}

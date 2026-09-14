using System;
using System.Diagnostics;
using System.IO;

internal static class Program
{
    private static int Main()
    {
        var root = AppDomain.CurrentDomain.BaseDirectory;
        var node = Path.Combine(root, "runtime", "node.exe");
        var script = Path.Combine(root, "server.mjs");

        if (!File.Exists(node) || !File.Exists(script))
        {
            Console.Error.WriteLine("Green Horizons files are missing. Keep GreenHorizons.exe next to the runtime and server.mjs folders.");
            Console.WriteLine("Press any key to close...");
            Console.ReadKey(true);
            return 1;
        }

        Console.Title = "Green Horizons — Guess the Place";
        Console.WriteLine("Starting Green Horizons...");
        Console.WriteLine("The game and admin pages will open in your browser.");
        Console.WriteLine("Close this window or press Ctrl+C to stop.");
        Console.WriteLine();

        var info = new ProcessStartInfo
        {
            FileName = node,
            Arguments = "\"server.mjs\" --desktop",
            WorkingDirectory = root,
            UseShellExecute = false
        };

        Process child = null;
        Console.CancelKeyPress += (sender, args) =>
        {
            args.Cancel = true;
            TryStop(child);
        };

        try
        {
            child = Process.Start(info);
            if (child == null)
            {
                Console.Error.WriteLine("Could not start the game server.");
                return 1;
            }
            child.WaitForExit();
            return child.ExitCode;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            Console.WriteLine("Press any key to close...");
            Console.ReadKey(true);
            return 1;
        }
        finally
        {
            TryStop(child);
        }
    }

    private static void TryStop(Process child)
    {
        try
        {
            if (child != null && !child.HasExited) child.Kill();
        }
        catch
        {
        }
    }
}

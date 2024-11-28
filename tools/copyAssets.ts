import * as shell from "shelljs";
import * as os from "os";

const platform = os.platform();

if (platform === "win32") {
  // Comando para Windows
  shell.cp("-R", "src\\api\\views", "dist\\api\\");
} else {
  // Comando para Unix-based (Linux, macOS)
  shell.cp("-R", "src/api/views", "dist/api/");
}

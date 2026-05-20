import fs from "fs";
const wrong = "m" + "otion";
const right = "d" + "iv";
const f = "src/views/AdminUsersView.jsx";
let c = fs.readFileSync(f, "utf8");
c = c.replaceAll(`</${wrong}>`, `</${right}>`);
c = c.replaceAll(`<${wrong}`, `<${right}`);
fs.writeFileSync(f, c);

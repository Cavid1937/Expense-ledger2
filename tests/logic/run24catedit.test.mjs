// Run 24: a custom category can be renamed and recoloured. Expected values by hand; synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { addCustomCat, editCustomCat } = H;
reset();
let l = addCustomCat([], "Pets", false, "#F28B82").list;
l = addCustomCat(l, "Side hustle", true, "#68D391").list;
const id = l[0].id;

section("R24-CE1. Rename and recolour");
const r = editCustomCat(l, id, "  Pet   care ", "#63B3ED");
ok(r.edited && r.list[0].name === "Pet care" && r.list[0].color === "#63B3ED" && r.list[0].id === id, "name tidied, colour changed, same id", r);
ok(r.list[0].income === false && r.list.length === 2, "type and the other category are untouched", r.list);
ok(editCustomCat(l, id, "Pets", "#F6AD55").edited, "keeping its own name is fine");

section("R24-CE2. Refusals");
ok(editCustomCat(l, id, " ", "#F28B82").reason === "empty", "empty refused");
ok(editCustomCat(l, id, "x".repeat(25), "#F28B82").reason === "long", "over 24 characters refused");
ok(editCustomCat(l, id, "SIDE hustle", "#F28B82").reason === "dup", "another custom category's name (any case) refused");
ok(editCustomCat(l, id, "Food", "#F28B82").reason === "dup", "a built-in category's name refused");
ok(editCustomCat(l, "u_nope123", "Zoo", "#F28B82").reason === "missing", "unknown id refused");
finish("run24catedit");

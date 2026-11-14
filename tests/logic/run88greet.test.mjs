// Run 88 (owner: varied greetings like "evening thoughts" or "moonlit chat", next to the usual good morning / afternoon / evening).
import { H, ok, section, finish } from "./lib.mjs";
const { greetingKey } = H;
const at = (h) => new Date(2026, 10, 15, h, 30);

section("R88-G1. The usual greeting about half the time, a varied line otherwise");
ok(greetingKey(at(9), 0) === "home.greet.morning" && greetingKey(at(9), 0.49) === "home.greet.morning", "morning, low pick: Good morning");
ok(greetingKey(at(9), 0.5) === "home.greet.m1" && greetingKey(at(9), 0.7) === "home.greet.m2" && greetingKey(at(9), 0.99) === "home.greet.m3", "morning, high pick: one of the three morning lines");
ok(greetingKey(at(14), 0.6) === "home.greet.a1" && greetingKey(at(20), 0.9) === "home.greet.e3", "afternoon and evening lines come from their own sets");

section("R88-G2. Late night has its own lines; odd input is safe");
ok(greetingKey(at(2), 0.1) === "home.greet.evening" && greetingKey(at(2), 0.55) === "home.greet.n1", "before 5 in the morning: Good evening or a night line (e.g. Moonlit check-in)");
ok(greetingKey(at(23), 1) === "home.greet.e3" && greetingKey(at(23), -3) === "home.greet.evening" && greetingKey(at(23), "x") === "home.greet.evening", "out-of-range or wrong picks never give a missing line");
const seen = new Set(); for (let i = 0; i < 100; i++) seen.add(greetingKey(at(19), i / 100));
ok(seen.size === 4, "across all picks in the evening, exactly the 4 evening greetings appear", [...seen]);
finish("run88greet");

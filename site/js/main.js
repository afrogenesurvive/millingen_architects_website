/* ============================================================================
 * main.js — boot. Registers the route table and starts the router.
 * This is the ONLY place URL patterns are defined.
 * ========================================================================== */

import { route, render } from "./router.js";
import { mountMenu } from "./menu.js";
import { mountHome } from "./fan.js";
import { mountProject } from "./project.js";
import { mountAbout } from "./about.js";

route(/^\/$/, mountHome);
route(/^\/about\/?$/, mountAbout);
route(/^\/project\/(?<id>[\w-]+)\/?$/, mountProject);

mountMenu(); // header button + popover, mounted once
render(); // initial paint

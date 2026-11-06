import test from "node:test";
import assert from "node:assert/strict";
import { hidesFooter, samePath, sectionHome } from "../lib/sections";

test("the logo goes to the home of the current area", () => {
  assert.equal(sectionHome("/"), "/");
  assert.equal(sectionHome("/the-map/"), "/");
  assert.equal(sectionHome("/social"), "/social/");
  assert.equal(sectionHome("/social/post/abc/"), "/social/");
  assert.equal(sectionHome("/social/notifications/"), "/social/");
  assert.equal(sectionHome("/social/messages/x/"), "/social/");
  assert.equal(sectionHome("/album"), "/album/");
  assert.equal(sectionHome("/socialite"), "/");
  assert.equal(sectionHome("/u/lucia/"), "/social/");
  assert.equal(sectionHome("/posts/gta-6-map/"), "/");
});

test("no footer on Social, Notifications, Messages or Album", () => {
  for (const path of ["/social/", "/social/search/", "/social/notifications/", "/social/messages/", "/album/", "/u/lucia/", "/posts/gta-6-map/"]) {
    assert.equal(hidesFooter(path), true, path);
  }
  for (const path of ["/", "/feed/", "/the-map/", "/user/", "/postscript/"]) {
    assert.equal(hidesFooter(path), false, path);
  }
  assert.equal(samePath("/social", "/social/"), true);
  assert.equal(samePath("/social/search", "/social/"), false);
});

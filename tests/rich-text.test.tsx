import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "../components/social/RichText";

const html = (text: string) => renderToStaticMarkup(<RichText text={text} />);

test("hashtags, mentions and links become links", () => {
  const out = html("Hyped for #GTA6 with @Lucia_VC https://www.rockstargames.com/VI.");
  assert.match(out, /<a [^>]*href="\/social\/?\?tag=gta6"[^>]*>#GTA6<\/a>/);
  assert.match(out, /<a [^>]*href="\/u\/lucia_vc\/?"[^>]*>@Lucia_VC<\/a>/);
  assert.match(out, /href="https:\/\/www\.rockstargames\.com\/VI"[^>]*rel="nofollow ugc noopener noreferrer"/);
  assert.match(out, /rockstargames\.com\/VI<\/a>\.$/);
});

test("post text cannot inject HTML or scripts", () => {
  const out = html('<img src=x onerror=alert(1)> javascript:alert(1) <script>x</script>');
  assert.doesNotMatch(out, /<img|<script/);
  assert.doesNotMatch(out, /href="javascript:/);
});

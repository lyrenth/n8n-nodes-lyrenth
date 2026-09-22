# n8n-nodes-lyrenth

Read any public web page as a clean **AIDocument** inside n8n, powered by
[Lyrenth](https://lyrenth.com): an index of over 4 billion pages built for AI
agents.

Point the node at a URL and it hands the next step the page itself: the
Markdown body with navigation, cookie bars and boilerplate stripped, plus the
title, description, language, headings, links, images and any structured data
the page carries, plus where the copy came from and how fresh it is. No HTML
parsing, no CSS selectors to maintain, no rewriting your workflow when a site
changes its theme.

The node is also available to the AI Agent node as a tool, so an agent can
fetch a page on its own while it works.

## Install

In n8n, open **Settings > Community nodes > Install**, enter
`n8n-nodes-lyrenth`, accept the risk prompt, and select **Install**. The
Lyrenth node then appears in the nodes panel.

For a self-hosted instance you can instead run `npm install n8n-nodes-lyrenth`
in your n8n custom nodes directory and restart n8n.

## Credentials

Create a **Lyrenth API** credential and paste your API key. Keys start with
`aiwk_`. Get one free at [lyrenth.com/signup](https://lyrenth.com/signup), then
copy it from [your dashboard](https://lyrenth.com/dashboard/keys). No card is
required.

Selecting **Test** on the credential calls the account endpoint, which reads no
page, so checking a key costs your account nothing.

## Operations

### Page: Read

One URL in, one AIDocument out. Options:

- **Markdown Only**: return just the URL, the title and the Markdown body,
  which is the shape most AI and text steps want.
- **Freshness**: *Cache First* serves the stored copy while it is inside the
  freshness window. *Force Refresh* skips it and crawls the page now.
- **Max Tokens**: cap the Markdown at roughly this many tokens, trimmed at a
  clean paragraph or sentence boundary, when the next step has a fixed context
  budget.

### Page: Read Many

Up to 20 URLs in one call, one per line or separated by commas. You get one
output item per URL, in order, each with an `ok` flag. A URL that could not be
served carries its own `status`, `error` and plain-English `message` instead of
a document, so a single unreachable page never costs you the other 19. Send a
21st URL and the call is refused with a message naming the limit, so nothing is
dropped in silence.

### Account: Get Quota

Reports the reads used, the limit and when the period resets. Useful as a guard
at the top of a large run.

## An example workflow

A daily reading digest, five nodes:

1. **Schedule Trigger** fires every morning.
2. **RSS Read** pulls the feeds you follow.
3. **Limit** keeps the 20 newest items.
4. **Lyrenth**, set to *Page > Read Many*, with the item links mapped into the
   **URLs** field. One call returns all 20 pages as AIDocuments.
5. **Filter** keeps the items where `ok` is true, and everything downstream,
   a summarizer, a database, an email, works on clean text instead of HTML.

Swap step 4 for *Page > Read* with **Markdown Only** turned on when a webhook
hands you a single link and you want the article text and nothing else.

## Documentation

- API reference: <https://lyrenth.com/docs/api>
- Quickstart: <https://lyrenth.com/docs/quickstart>
- The AIDocument shape: <https://lyrenth.com/docs/aidocument>

## License

MIT. See [LICENSE](LICENSE).

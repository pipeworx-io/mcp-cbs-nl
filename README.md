# @pipeworx/mcp-cbs-nl

Statistics Netherlands (CBS) StatLine — the Dutch national statistics office's full
open-data catalogue, over OData v3. Population, labour, energy, prices, trade and
several thousand other official tables, in Dutch and English.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | What it answers |
|---|---|
| `search_tables` | Which StatLine tables cover a topic — id, title, period, frequency, language |
| `table_info` | One table's title, summary, period covered, frequency and update status |
| `table_dimensions` | The columns of a table: key, meaning, unit, decimals — read this before `get_data` |
| `dimension_values` | The valid codes for one dimension (`Periods`, a region key, …) |
| `get_data` | Observations from a table, with OData `$select` / `$filter` / `$top` / `$skip` |

Table ids ending in `eng`/`ENG` carry English labels; the rest are Dutch. Start at
`search_tables`, then `table_dimensions`, then `get_data` — the dimension keys are
table-specific and not guessable.

## Auth

None. No key, no registration, no quota to manage.

CBS refuses Cloudflare's egress addresses on both OData services (a 400 ASP.NET error
page from `/ODataCatalog`, an empty 406 from `/ODataApi`) while serving the identical
URLs from other networks. Calls therefore fall back to a non-Cloudflare relay when the
direct attempt is refused. Nothing about this is visible to a caller, but it explains
why running this pack yourself, from your own network, may behave differently
from the gateway's.

## Data sources

- Catalogue: `https://opendata.cbs.nl/ODataCatalog/Tables`
- Tables: `https://opendata.cbs.nl/ODataApi/odata/<table-id>/`
- Portal + documentation: https://opendata.cbs.nl/statline/portal.html
- Licence: CC BY 4.0 (Centraal Bureau voor de Statistiek)

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "cbs-nl": {
      "url": "https://gateway.pipeworx.io/cbs-nl/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/cbs-nl/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Cbs Nl data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

# mcp-cbs-nl

Statistics Netherlands (CBS / StatLine) OData MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_tables` | Find CBS StatLine datasets by keyword (matched against title). Returns table id, title, period and language. Table ids ending in "eng"/"ENG" have English labels; others are Dutch. |
| `table_info` | Metadata for one table: title, summary, time period covered, frequency, update status and description. Pass a table id like "37296eng". |
| `table_dimensions` | Column/dimension definitions for a table (DataProperties): what each field means, its key, type, unit and decimals. Use this before get_data to learn which $select keys and $filter dimensions exist. |
| `dimension_values` | List the valid codes/labels for one dimension of a table (a sub-endpoint such as "Periods" or a region/category dimension key, as named in the table root or table_dimensions). |
| `get_data` | Fetch observations from a table (TypedDataSet). Supports OData v3 query params. Use $select to pick columns (from table_dimensions keys) and $filter to subset, e.g. filter="Periods eq '2020JJ00'". Always set a $top to avoid huge responses. |

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Cbs Nl data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

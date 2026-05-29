interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Statistics Netherlands (CBS / StatLine) OData MCP.
 */


const CATALOG = 'https://opendata.cbs.nl/ODataCatalog/Tables';
const TABLE = 'https://opendata.cbs.nl/ODataApi/odata';
const UA = 'pipeworx-mcp-cbs-nl/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_tables',
    description:
      'Find CBS StatLine datasets by keyword (matched against title). Returns table id, title, period and language. Table ids ending in "eng"/"ENG" have English labels; others are Dutch.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search term matched in the table title, e.g. "population", "energy", "wages".' },
        english_only: { type: 'boolean', description: 'If true, only return English-language tables (id ends in "eng"). Default false.' },
        top: { type: 'number', description: 'Max results (default 25).' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'table_info',
    description: 'Metadata for one table: title, summary, time period covered, frequency, update status and description. Pass a table id like "37296eng".',
    inputSchema: {
      type: 'object',
      properties: { table: { type: 'string', description: 'CBS table id, e.g. "37296eng".' } },
      required: ['table'],
    },
  },
  {
    name: 'table_dimensions',
    description:
      'Column/dimension definitions for a table (DataProperties): what each field means, its key, type, unit and decimals. Use this before get_data to learn which $select keys and $filter dimensions exist.',
    inputSchema: {
      type: 'object',
      properties: { table: { type: 'string', description: 'CBS table id, e.g. "37296eng".' } },
      required: ['table'],
    },
  },
  {
    name: 'dimension_values',
    description:
      'List the valid codes/labels for one dimension of a table (a sub-endpoint such as "Periods" or a region/category dimension key, as named in the table root or table_dimensions).',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'CBS table id, e.g. "37296eng".' },
        dimension: { type: 'string', description: 'Dimension endpoint name, e.g. "Periods", "CaribbeanNetherlands".' },
        top: { type: 'number', description: 'Max rows (default 100).' },
      },
      required: ['table', 'dimension'],
    },
  },
  {
    name: 'get_data',
    description:
      'Fetch observations from a table (TypedDataSet). Supports OData v3 query params. Use $select to pick columns (from table_dimensions keys) and $filter to subset, e.g. filter="Periods eq \'2020JJ00\'". Always set a $top to avoid huge responses.',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'CBS table id, e.g. "37296eng".' },
        select: { type: 'string', description: 'OData $select, comma-separated dimension/topic keys, e.g. "Periods,TotalPopulation_1".' },
        filter: { type: 'string', description: "OData $filter, e.g. \"Periods eq '2020JJ00'\" or \"substringof('2020',Periods)\"." },
        top: { type: 'number', description: 'OData $top, max rows to return (default 50).' },
        skip: { type: 'number', description: 'OData $skip, rows to skip for paging.' },
      },
      required: ['table'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_tables': {
      const keyword = reqStr(args, 'keyword', '"population"');
      const safe = keyword.toLowerCase().replace(/'/g, "''");
      const filters = [`substringof('${safe}',tolower(Title))`];
      if (args.english_only === true) filters.push("endswith(tolower(Identifier),'eng')");
      const params = new URLSearchParams({
        $format: 'json',
        $select: 'Identifier,Title,ShortDescription,Period,Frequency,Language',
        $filter: filters.join(' and '),
        $top: String(numArg(args.top, 25)),
      });
      return cbsGet(`${CATALOG}?${params.toString()}`);
    }
    case 'table_info':
      return cbsGet(`${TABLE}/${tableId(args)}/TableInfos?$format=json`);
    case 'table_dimensions':
      return cbsGet(`${TABLE}/${tableId(args)}/DataProperties?$format=json`);
    case 'dimension_values': {
      const dim = reqStr(args, 'dimension', '"Periods"').replace(/[^A-Za-z0-9_]/g, '');
      const params = new URLSearchParams({ $format: 'json', $top: String(numArg(args.top, 100)) });
      return cbsGet(`${TABLE}/${tableId(args)}/${dim}?${params.toString()}`);
    }
    case 'get_data': {
      const params = new URLSearchParams({ $format: 'json', $top: String(numArg(args.top, 50)) });
      if (typeof args.select === 'string' && args.select.trim()) params.set('$select', args.select);
      if (typeof args.filter === 'string' && args.filter.trim()) params.set('$filter', args.filter);
      if (args.skip !== undefined) params.set('$skip', String(numArg(args.skip, 0)));
      return cbsGet(`${TABLE}/${tableId(args)}/TypedDataSet?${params.toString()}`);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function cbsGet(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CBS: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function tableId(args: Record<string, unknown>): string {
  return reqStr(args, 'table', '"37296eng"').trim().replace(/[^A-Za-z0-9_]/g, '');
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

function numArg(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;

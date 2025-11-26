const suppressedConsoleMethods = ['log', 'info', 'warn', 'error', 'debug'];
let consoleSpies = [];
const originalEmitWarning = process.emitWarning;

process.emitWarning = (warning, ...rest) => {
  const message =
    typeof warning === 'string' ? warning : warning?.message || '';
  if (message.includes('punycode module is deprecated')) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...rest);
};

jest.mock('axios', () => {
  const mockAxios = {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn()
  };
  mockAxios.create.mockReturnValue(mockAxios);
  mockAxios.default = mockAxios;
  return mockAxios;
});

require('@testing-library/jest-dom');
const axios = require('axios');

beforeEach(() => {
  consoleSpies = suppressedConsoleMethods.map((method) =>
    jest.spyOn(console, method).mockImplementation(() => {})
  );
});

afterEach(() => {
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: [] });
  axios.post.mockResolvedValue({ data: {} });
  consoleSpies.forEach((spy) => spy.mockRestore());
  consoleSpies = [];
});
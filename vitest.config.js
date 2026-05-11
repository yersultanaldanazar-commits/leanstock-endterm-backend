// Sets up Vitest for running backend tests.
module.exports = {
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'] }
  }
};

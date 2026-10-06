// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

import React from 'react';

jest.mock('react-apexcharts', () => {
  const React = require('react');
  return function DummyChart() {
    return React.createElement('div', { 'data-testid': 'mock-apex-chart' });
  };
});

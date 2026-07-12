import React from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webDarkTheme } from '@fluentui/react-components';
import App from './App.jsx';
import './styles.css';

const pinkTheme = {
  ...webDarkTheme,
  colorBrandBackground: '#c84f91',
  colorBrandBackgroundHover: '#dc65a5',
  colorBrandBackgroundPressed: '#aa3f7a',
  colorBrandForeground1: '#ef8fbd',
  colorBrandForeground2: '#e57caf',
  colorCompoundBrandForeground1: '#ef8fbd',
  colorCompoundBrandBackground: '#c84f91',
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={pinkTheme}>
      <App />
    </FluentProvider>
  </React.StrictMode>,
);

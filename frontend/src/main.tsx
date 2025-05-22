import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App.js';
import '@/styles/index.css';
import routes from './routes.js';
import { createRoot } from 'react-dom/client';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: routes.map((route) => {
      return {
        index: route.path === '/',
        path: route.path === '/' ? undefined : route.path,
        element: route.element as JSX.Element,
      };
    }),
  },
]);

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<RouterProvider router={router} />);

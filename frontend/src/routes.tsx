import { createRef } from 'react';
import HomePage from '@/pages/HomePage';

const routes = [
  {
    path: '/',
    element: <HomePage />,
    nodeRef: createRef(),
  },
];

export default routes;

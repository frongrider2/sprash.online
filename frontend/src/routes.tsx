import { createRef } from 'react';
import HomePage from '@/pages/HomePage';
import TransactionPage from '@/pages/TransactionPage';

const routes = [
  {
    path: '/',
    element: <HomePage />,
    nodeRef: createRef(),
  },
  {
    path: '/transaction',
    element: <TransactionPage />,
    nodeRef: createRef(),
  },
];

export default routes;

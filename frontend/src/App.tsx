import { SwitchTransition, CSSTransition } from 'react-transition-group';
import { useLocation, useOutlet } from 'react-router-dom';
import routes from './routes';
import { store } from '@/states/store';
import { Provider as ReduxToolkitProvider } from 'react-redux';
import Layout from '@/components/layout/Layout';
import Initialization from '@/Initialization';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { networkConfig } from '@/config/networkConfig';
import '@mysten/dapp-kit/dist/index.css';
import PredictionSystem from '@/PredictionSystem';
import 'sweetalert2/src/sweetalert2.scss';

interface Props extends SimpleComponent {}

const defaultNetwork = import.meta.env.VITE_NETWORK;
const queryClient = new QueryClient();

function App(props: Props) {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const { nodeRef } =
    routes.find((route) => route.path === location.pathname) ?? {};

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={defaultNetwork}
      >
        <WalletProvider autoConnect>
          <ReduxToolkitProvider store={store}>
            <Initialization />
            <PredictionSystem />
            <Layout>
              <SwitchTransition>
                <CSSTransition
                  key={location.pathname}
                  nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
                  timeout={300}
                  classNames="fade"
                  unmountOnExit
                >
                  {(_) => (
                    <div
                      ref={nodeRef as React.RefObject<HTMLDivElement>}
                      className="fade"
                    >
                      {currentOutlet}
                    </div>
                  )}
                </CSSTransition>
              </SwitchTransition>
            </Layout>
          </ReduxToolkitProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;

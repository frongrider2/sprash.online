import styled from 'styled-components';
import logo from '@/assets/logo/logo.png';
import NavLinkItem from '@/components/layout/NavLinkItem';
import {
  ConnectButton,
  useCurrentAccount,
  useCurrentWallet,
} from '@mysten/dapp-kit';
import SuiBalance from '@/components/utility/SuiBalance';
interface Props extends SimpleComponent {}

const NavbarWrapper = styled.div``;

function Navbar(props: Props) {
  const { connectionStatus } = useCurrentWallet();
  return (
    <NavbarWrapper className="w-full h-18 bg-[#110B1A] flex items-center justify-between px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img src={logo} alt="logo" className="h-16" />
          <i className="text-2xl font-bold text-emerald-500">Sprash</i>
        </div>

        <div className="flex items-center gap-2 ml-6">
          {/* <NavLinkItem to="/" label="Home" /> */}
          {/* <NavLinkItem to="/transaction" label="Transaction" /> */}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connectionStatus === 'connected' && <SuiBalance />}
        <ConnectButton />
      </div>
    </NavbarWrapper>
  );
}

export default Navbar;

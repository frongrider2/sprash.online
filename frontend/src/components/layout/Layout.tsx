import Navbar from '@/components/layout/Navbar';
import styled from 'styled-components';

interface Props extends SimpleComponent {
  children: React.ReactNode;
}

const LayoutWrapper = styled.div``;

function Layout(props: Props) {
  return (
    <LayoutWrapper>
      <Navbar />
      <div className="mt-4 w-full mx-auto">{props.children}</div>
    </LayoutWrapper>
  );
}

export default Layout;

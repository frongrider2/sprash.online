import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';

interface NavLinkItemProps {
  to: string;
  label: string;
  exact?: boolean;
}

const NavLinkItem = ({ to, label, exact = false }: NavLinkItemProps) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={clsx(
        'py-2 px-3 text-sm font-semibold transition-colors',
        isActive ? 'text-blue-400' : 'text-white hover:text-blue-400'
      )}
    >
      {label}
    </Link>
  );
};

export default NavLinkItem;

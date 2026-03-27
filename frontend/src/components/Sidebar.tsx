import { NavLink } from 'react-router-dom';

const links = [
  { to: '/projects', label: 'Workflows' },
  { to: '/vault', label: 'Vault' },
  { to: '/chat', label: 'AI Assistant' },
];

export default function Sidebar() {
  return (
    <nav
      style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: '#1A2B3C',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '24px 16px',
          color: '#C9A84C',
          fontFamily: 'Georgia, serif',
          fontSize: 24,
        }}
      >
        Brikell
      </div>
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            display: 'block',
            padding: 16,
            width: '100%',
            color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

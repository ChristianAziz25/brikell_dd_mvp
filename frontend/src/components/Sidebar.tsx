import { NavLink } from 'react-router-dom';

const links = [
  { to: '/chat', label: 'AI Assistant' },
  { to: '/projects', label: 'Workflows' },
  { to: '/vault', label: 'Vault' },
];

export default function Sidebar() {
  return (
    <nav
      style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '24px 16px',
          color: '#1A2B3C',
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
            padding: '12px 16px',
            width: '100%',
            color: isActive ? '#C9A84C' : '#374151',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
            borderLeft: isActive ? '4px solid #C9A84C' : '4px solid transparent',
            background: isActive ? '#FEF9E7' : 'transparent',
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

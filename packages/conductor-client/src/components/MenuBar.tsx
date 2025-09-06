import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Menu, MenuItem, IconButton } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';

interface MenuBarProps {
  onLoadShow: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onLoadShow }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLoadShow = () => {
    onLoadShow();
    handleMenuClose();
  };

  const handleRecent = () => {
    // Placeholder for recent shows functionality
    console.log('Recent shows clicked');
    handleMenuClose();
  };

  const handleAbout = () => {
    // Placeholder for about dialog
    console.log('About clicked');
    handleMenuClose();
  };

  return (
    <AppBar position="static" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #dee2e6', boxShadow: 'none' }}>
      <Toolbar style={{ padding: '0 1rem', minHeight: '48px' }}>
        <IconButton
          onClick={handleMenuOpen}
          aria-label="File menu"
          style={{ marginRight: '0.5rem' }}
        >
          <IconMenu2 size={20} />
        </IconButton>
        <Typography variant="h6" style={{ flexGrow: 1, fontSize: '1.25rem', fontWeight: 500 }}>
          File
        </Typography>
        <Menu
          opened={isMenuOpen}
          onClose={handleMenuClose}
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={handleLoadShow}>Load Show</MenuItem>
          <MenuItem onClick={handleRecent}>Recent</MenuItem>
          <MenuItem onClick={handleAbout}>About</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default MenuBar;




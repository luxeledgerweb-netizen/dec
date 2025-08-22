import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Box,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  alpha,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useAppState, useAppDispatch } from '../../contexts/AppContext';
import { motion } from 'framer-motion';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '20ch',
      },
    },
  },
}));

const Header: React.FC = () => {
  const { vault, searchOptions, selectedFiles } = useAppState();
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(searchOptions.query);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    dispatch({
      type: 'SET_SEARCH_OPTIONS',
      payload: { query }
    });
  };

  const handleLockVault = () => {
    if (vault) {
      const updatedVault = {
        ...vault,
        isLocked: true
      };
      dispatch({ type: 'SET_VAULT', payload: updatedVault });
      localStorage.setItem('inventoryVaultConfig', JSON.stringify(updatedVault));
    }
    handleProfileMenuClose();
  };

  const handleSettings = () => {
    // Navigate to settings
    handleProfileMenuClose();
  };

  const isMenuOpen = Boolean(anchorEl);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      component={motion.div}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          >
            <LockIcon sx={{ color: 'primary.main', mr: 1 }} />
          </motion.div>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            Inventory Vault
          </Typography>
        </Box>

        {/* Vault Name */}
        {vault && (
          <Typography
            variant="subtitle2"
            sx={{
              ml: 2,
              px: 2,
              py: 0.5,
              backgroundColor: alpha('#1976d2', 0.1),
              borderRadius: 1,
              color: 'primary.main',
              fontWeight: 500,
            }}
          >
            {vault.name}
          </Typography>
        )}

        {/* Search Bar */}
        <Search sx={{ ml: 'auto', mr: 2 }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search files, folders, tags..."
            inputProps={{ 'aria-label': 'search' }}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </Search>

        {/* Selected Files Counter */}
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Typography
              variant="body2"
              sx={{
                px: 2,
                py: 0.5,
                backgroundColor: 'primary.main',
                color: 'white',
                borderRadius: 1,
                mr: 2,
                fontWeight: 500,
              }}
            >
              {selectedFiles.length} selected
            </Typography>
          </motion.div>
        )}

        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton size="large" color="inherit">
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Settings */}
        <Tooltip title="Settings">
          <IconButton size="large" color="inherit" onClick={handleSettings}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* Profile Menu */}
        <Tooltip title="Account">
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleProfileMenuOpen}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Tooltip>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={isMenuOpen}
          onClose={handleProfileMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
            },
          }}
        >
          <MenuItem onClick={handleProfileMenuClose}>
            <AccountCircleIcon sx={{ mr: 2 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleSettings}>
            <SettingsIcon sx={{ mr: 2 }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLockVault}>
            <LockIcon sx={{ mr: 2 }} />
            Lock Vault
          </MenuItem>
          <MenuItem onClick={handleProfileMenuClose}>
            <ExitToAppIcon sx={{ mr: 2 }} />
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Menu, MenuItem, Box, Chip, Button } from '@mui/material';
import { useTheme } from '@mui/material';
import {
  Menu as MenuIcon,
  Person as AccountIcon,
  ArrowBack as ArrowBackIcon,
  ExitToApp as LogoutIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import classNames from 'classnames';

// images
import profile from '../../images/main-profile.png';
import config from '../../config';

// styles
import useStyles from './styles';

// components
import { Typography, Avatar } from '../Wrappers/Wrappers';

// context
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebar,
} from '../../context/LayoutContext';
import { useUserState, useUserDispatch, signOut } from '../../context/UserContext';

export default function Header() {
  let classes = useStyles();
  let theme = useTheme();
  const navigate = useNavigate();

  // global
  let layoutState = useLayoutState();
  let layoutDispatch = useLayoutDispatch();
  let userDispatch = useUserDispatch();
  const { currentUser, userRole } = useUserState();

  // local
  const [profileMenu, setProfileMenu] = useState(null);
  const [isSmall, setSmall] = useState(false);

  useEffect(function () {
    window.addEventListener('resize', handleWindowWidthChange);
    handleWindowWidthChange();
    return function cleanup() {
      window.removeEventListener('resize', handleWindowWidthChange);
    };
  });

  function handleWindowWidthChange() {
    let windowWidth = window.innerWidth;
    let breakpointWidth = theme.breakpoints.values.md;
    let isSmallScreen = windowWidth < breakpointWidth;
    setSmall(isSmallScreen);
  }

  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';

  return (
    <AppBar position='fixed' className={classes.appBar} style={{ background: '#0b1728' }}>
      <Toolbar className={classes.toolbar}>
        <IconButton
          color='inherit'
          onClick={() => toggleSidebar(layoutDispatch)}
          className={classNames(
            classes.headerMenuButton,
            classes.headerMenuButtonCollapse,
          )}
        >
          {(!layoutState.isSidebarOpened && isSmall) ||
          (layoutState.isSidebarOpened && !isSmall) ? (
            <ArrowBackIcon
              classes={{
                root: classNames(
                  classes.headerIcon,
                  classes.headerIconCollapse,
                ),
              }}
            />
          ) : (
            <MenuIcon
              classes={{
                root: classNames(
                  classes.headerIcon,
                  classes.headerIconCollapse,
                ),
              }}
            />
          )}
        </IconButton>

        <Box display='flex' alignItems='center' gap={1.5}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            T
          </div>
          <Typography variant='h6' weight='medium' className={classes.logotype} style={{ color: '#fff' }}>
            TrustLens
          </Typography>
        </Box>

        <div className={classes.grow} />

        <Button
          onClick={() => navigate(userRole === 'lender' ? '/app/loan-forms?role=lender' : '/app/loan-forms?role=borrower')}
          size='small'
          variant='outlined'
          startIcon={<DocumentIcon sx={{ fontSize: 16 }} />}
          style={{
            color: userRole === 'lender' ? '#10b981' : '#38bdf8',
            borderColor: userRole === 'lender' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)',
            textTransform: 'none',
            fontWeight: 700,
            marginRight: 12,
            borderRadius: 8,
            fontSize: 12,
            padding: '4px 10px',
          }}
        >
          📋 Loan Forms
        </Button>

        <Chip
          size='small'
          label={userRole === 'lender' ? 'Lender Portal' : 'Borrower Portal'}
          style={{
            marginRight: 14,
            background: userRole === 'lender' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
            color: userRole === 'lender' ? '#10b981' : '#38bdf8',
            fontWeight: 700,
            border: `1px solid ${userRole === 'lender' ? '#10b981' : '#38bdf8'}40`,
          }}
        />

        <IconButton
          aria-haspopup='true'
          color='inherit'
          className={classes.headerMenuButton}
          aria-controls='profile-menu'
          onClick={(e) => setProfileMenu(e.currentTarget)}
        >
          <Avatar
            alt={displayName}
            classes={{ root: classes.headerIcon }}
            style={{ background: '#0284c7', color: '#fff', fontWeight: 700 }}
          >
            {displayName[0]?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>

        <Typography
          block
          style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
        >
          <div className={classes.profileLabel}>Hi,&nbsp;</div>
          <Typography weight={'bold'} className={classes.profileLabel}>
            {displayName}
          </Typography>
        </Typography>

        <Menu
          id='profile-menu'
          open={Boolean(profileMenu)}
          anchorEl={profileMenu}
          onClose={() => setProfileMenu(null)}
          className={classes.headerMenu}
          classes={{ paper: classes.profileMenu }}
          disableAutoFocusItem
        >
          <div className={classes.profileMenuUser} style={{ padding: '16px 20px', minWidth: 200 }}>
            <Typography variant='h5' weight='bold' style={{ color: '#1e293b' }}>
              {displayName}
            </Typography>
            <Typography variant='caption' style={{ color: '#64748b', display: 'block' }}>
              {currentUser?.email || 'Logged In'}
            </Typography>
            <Chip
              size='small'
              label={userRole === 'lender' ? 'Role: Lender' : 'Role: Borrower'}
              style={{ marginTop: 8, fontSize: 11 }}
            />
          </div>

          <MenuItem
            onClick={() => {
              setProfileMenu(null);
              navigate('/app/dashboard');
            }}
          >
            <AccountIcon className={classes.profileMenuIcon} />
            <Typography variant='body2' style={{ marginLeft: 8 }}>
              Dashboard
            </Typography>
          </MenuItem>

          <MenuItem
            onClick={() => {
              setProfileMenu(null);
              navigate(userRole === 'lender' ? '/app/loan-forms?role=lender' : '/app/loan-forms?role=borrower');
            }}
          >
            <DocumentIcon className={classes.profileMenuIcon} />
            <Typography variant='body2' style={{ marginLeft: 8 }}>
              Fill Loan Forms
            </Typography>
          </MenuItem>

          <MenuItem
            onClick={() => {
              setProfileMenu(null);
              navigate('/');
            }}
          >
            <Typography variant='body2' style={{ marginLeft: 8, color: '#0284c7' }}>
              TrustLens Home
            </Typography>
          </MenuItem>

          <MenuItem
            onClick={() => {
              setProfileMenu(null);
              signOut(userDispatch, navigate);
            }}
            style={{ borderTop: '1px solid #f1f5f9', color: '#dc2626' }}
          >
            <LogoutIcon style={{ fontSize: 18, color: '#dc2626', marginRight: 8 }} />
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

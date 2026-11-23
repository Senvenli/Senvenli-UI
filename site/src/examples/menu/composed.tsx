import { Button } from "@senvenli/react/action";
import { Avatar } from "@senvenli/react/display";
import { Menu, MenuItem, MenuSection, MenuSeparator, MenuSubmenu } from "@senvenli/react/overlay";

export default function Example() {
  return (
    <Menu trigger={<Button iconBefore="user">Account</Button>} aria-label="Account">
      <MenuItem id="profile" textValue="Sofia Marin">
        <span className="flex items-center gap-ds-100">
          <Avatar name="Sofia Marin" src="/avatars/05.webp" size="small" />
          <span className="flex flex-col">
            <span className="text-ds-text">Sofia Marin</span>
            <span className="text-body-small text-ds-text-subtle">sofia@example.com</span>
          </span>
        </span>
      </MenuItem>
      <MenuSeparator />
      <MenuSection title="Workspace">
        <MenuItem id="settings" icon="settings" shortcut="⌘,">
          Settings
        </MenuItem>
        <MenuSubmenu id="switch" label="Switch workspace" icon="arrow-left-right">
          <MenuItem id="acme">Acme</MenuItem>
          <MenuItem id="globex">Globex</MenuItem>
        </MenuSubmenu>
      </MenuSection>
      <MenuSeparator />
      <MenuItem id="sign-out" icon="log-out" tone="danger">
        Sign out
      </MenuItem>
    </Menu>
  );
}

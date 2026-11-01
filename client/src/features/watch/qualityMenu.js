// Core build: the full player minus the HLS/DASH engine, which MP4 playback does not need.
import videojs from 'video.js/core.es.js';

const MenuButton = videojs.getComponent('MenuButton');
const MenuItem = videojs.getComponent('MenuItem');

class QualityMenuItem extends MenuItem {
  constructor(player, options) {
    super(player, { ...options, label: options.quality.label, selectable: true });
  }

  handleClick() {
    this.options_.onSelect(this.options_.quality.label);
  }
}

/**
 * Control-bar menu for switching between renditions (360p / 480p / 720p).
 * It lives inside the player so it also works in fullscreen. Options:
 * `qualities` ({ label }[]), `current` (label) and `onSelect(label)`.
 */
class QualityMenuButton extends MenuButton {
  constructor(player, options) {
    super(player, options);
    this.controlText('Quality');

    // Show the current quality as text on the button, like the speed menu does.
    this.valueEl_ = videojs.dom.createEl(
      'span',
      { className: 'vjs-quality-value' },
      { 'aria-hidden': 'true' },
    );
    this.menuButton_.el().appendChild(this.valueEl_);
    this.setCurrent(options.current);
  }

  // The wrapper holds both the button and its popup menu; style and find the menu through it.
  buildWrapperCSSClass() {
    return `vjs-quality-menu ${super.buildWrapperCSSClass()}`;
  }

  buildCSSClass() {
    return `vjs-quality-button ${super.buildCSSClass()}`;
  }

  createItems() {
    const { qualities = [], current, onSelect } = this.options_;
    return qualities.map(
      (quality) =>
        new QualityMenuItem(this.player_, {
          quality,
          selected: quality.label === current,
          onSelect,
        }),
    );
  }

  /** Marks `label` as the active quality in the button text and the menu. */
  setCurrent(label) {
    this.valueEl_.textContent = label;
    this.items?.forEach((item) => item.selected(item.options_.quality.label === label));
  }
}

videojs.registerComponent('QualityMenuButton', QualityMenuButton);

/**
 * Adds the quality menu to the control bar, just before the fullscreen button.
 * Returns the menu so the caller can update its current value.
 */
export function addQualityMenu(player, { qualities, current, onSelect }) {
  const controlBar = player.getChild('ControlBar');
  const fullscreenIndex = controlBar.children().indexOf(controlBar.getChild('FullscreenToggle'));
  return controlBar.addChild(
    'QualityMenuButton',
    { qualities, current, onSelect },
    fullscreenIndex === -1 ? undefined : fullscreenIndex,
  );
}

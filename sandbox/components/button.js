const React = require('react');

/**
 * Creates a new button.
 *
 * @param {Node} children Children of the button.
 * @param {Function} onClick Click handler.
 * @constructor
 */
function Button(props) {
  return (
    <button className={`btn ${props.primary && 'btn-primary'}`.trim()} onClick={ props.onClick }>
      { props.children }
    </button>
  )
}

module.exports = Button;

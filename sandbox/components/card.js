const React = require('react');

function Card(props) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title h5">{ props.title }</div>
        { props.subtitle && <div className="card-subtitle text-gray">{ props.subtitle }</div> }
      </div>
      { props.body && <div className="card-body">{ props.body }</div>}
      { props.footer && <div className="card-footer">{ props.footer }</div>}
    </div>
  );
}

module.exports = Card;

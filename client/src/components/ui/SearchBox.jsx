import { useId, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback.js';

const SEARCH_DELAY_MS = 300;

/**
 * Searches as the user types (after a short pause) or immediately on Enter.
 * `value` is the active search from the URL; `onSearch` receives trimmed text.
 */
export function SearchBox({ value, onSearch, label = 'Search videos', placeholder }) {
  const inputId = useId();
  const [text, setText] = useState(value);
  const [shownValue, setShownValue] = useState(value);
  const debouncedSearch = useDebouncedCallback(onSearch, SEARCH_DELAY_MS);

  // The search changed from outside (Back button, "Clear filters"): show it, unless it is
  // what the user is already typing, so a trailing space is not removed mid-word.
  if (value !== shownValue) {
    setShownValue(value);
    if (value !== text.trim()) setText(value);
  }

  function handleChange(event) {
    setText(event.target.value);
    debouncedSearch.call(event.target.value.trim());
  }

  function handleSubmit(event) {
    event.preventDefault();
    debouncedSearch.cancel();
    onSearch(text.trim());
  }

  function handleClear() {
    debouncedSearch.cancel();
    setText('');
    onSearch('');
  }

  return (
    <Form role="search" onSubmit={handleSubmit}>
      <Form.Label htmlFor={inputId} className="visually-hidden">
        {label}
      </Form.Label>
      <InputGroup>
        <InputGroup.Text aria-hidden="true">
          <i className="bi bi-search" />
        </InputGroup.Text>
        <Form.Control
          id={inputId}
          type="search"
          placeholder={placeholder}
          autoComplete="off"
          maxLength={200}
          value={text}
          onChange={handleChange}
        />
        {text && (
          <Button variant="outline-secondary" onClick={handleClear} aria-label="Clear search">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </Button>
        )}
      </InputGroup>
    </Form>
  );
}

import React, { useState } from 'react';
import { convertToRaw, Editor, EditorState, RichUtils, ContentState, convertFromHTML } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import 'draft-js/dist/Draft.css';
import './App.css';
import axios from 'axios';


function App() {
	const [editorState, setEditorState] = useState(EditorState.createEmpty());

	const handleKeyCommand = (command, editorState) => {
		const newState = RichUtils.handleKeyCommand(editorState, command);
		if (newState) {
			setEditorState(newState);
			return 'handled';
		}
		return 'not-handled';
	};


	const toggleBlockType = (blockType) => {
		setEditorState(RichUtils.toggleBlockType(editorState, blockType));
	}

	const toggleInlineStyle = (inlineStyle) => {
		setEditorState(RichUtils.toggleInlineStyle(editorState, inlineStyle));
	}

	const BlockStyleControls = (props) => {
		const { editorState } = props;
		const selection = editorState.getSelection();
		const blockType = editorState
			.getCurrentContent()
			.getBlockForKey(selection.getStartKey())
			.getType();

		const BLOCK_TYPES = [
			{ label: 'H1', style: 'header-one' },
			{ label: 'H2', style: 'header-two' },
			{ label: 'H3', style: 'header-three' },
			{ label: 'H4', style: 'header-four' },
			{ label: 'H5', style: 'header-five' },
			{ label: 'H6', style: 'header-six' },
			{ label: 'Blockquote', style: 'blockquote' },
			{ label: 'UL', style: 'unordered-list-item' },
			{ label: 'OL', style: 'ordered-list-item' },
		];
		const BlockStyle = BLOCK_TYPES.map((type) =>
			<StyleButton
				key={type.label}
				active={type.style === blockType}
				label={type.label}
				onToggle={props.onToggle}
				style={type.style}
			/>
		);
		return (
			<div className="RichEditor-controls">
				{BlockStyle}
			</div>
		);
	};
	const InlineStyleControls = (props) => {
		const INLINE_STYLES = [
			{ label: 'Bold', style: 'BOLD' },
			{ label: 'Italic', style: 'ITALIC' },
			{ label: 'Underline', style: 'UNDERLINE' },
			{ label: 'Monospace', style: 'CODE' },
		];
		const currentStyle = props.editorState.getCurrentInlineStyle();
		const InlineStyle = INLINE_STYLES.map((type) =>
			<StyleButton
				key={type.label}
				active={currentStyle.has(type.style)}
				label={type.label}
				onToggle={props.onToggle}
				style={type.style}
			/>
		);
		return (
			<div className="RichEditor-controls">
				{InlineStyle}
			</div>
		);

	};
	const StyleButton = (props) => {
		const onToggle = (e) => {
			e.preventDefault();
			props.onToggle(props.style);
		};
		let className = 'RichEditor-styleButton';
		if (props.active) {
			className += ' RichEditor-activeButton';
		}
		return (
			<span className={className} onMouseDown={onToggle}>
				{props.label}
			</span>
		);
	};

	const handleSave = async () => {
		const rawContentState = convertToRaw(editorState.getCurrentContent());
		const hashtagConfig = {
			trigger: '#',
			separator: ' ',
		};
		const directional = true;
		const customEntityTransform = (entity) => {
			if (entity.type === 'LINK') {
				return <a href={entity.data.url}>{entity.data.url}</a>;
			}
			else if (entity.type === 'IMAGE') {
				return <img src={entity.data.src} alt={entity.data.alt} />;
			}
		};
		const html = draftToHtml(
			rawContentState,
			hashtagConfig,
			directional,
			customEntityTransform
		);
		console.log(html);
		await fetch('https://localhost:5001/api/Export', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				"access-control-allow-origin": "*",
			},
			body: JSON.stringify({ "htmlString": html }),
		})
			.then(res => res.blob())
			.then(blob => {
				const url = window.URL.createObjectURL(new Blob([blob]));
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', 'file.docx');
				document.body.appendChild(link);
				link.click();
				link.remove();
			}).catch(err => console.log(err));


	};

	const convertToHtml = (editorState) => {
		const rawContentState = convertToRaw(editorState.getCurrentContent());
		const hashtagConfig = {
			trigger: '#',
			separator: ' ',
		};
		const directional = true;
		const customEntityTransform = (entity) => {
			if (entity.type === 'LINK') {
				return <a href={entity.data.url}>{entity.data.url}</a>;
			}
			else if (entity.type === 'IMAGE') {
				return <img src={entity.data.src} alt={entity.data.alt} />;
			}
		};
		const html = draftToHtml(
			rawContentState,
			hashtagConfig,
			directional,
			customEntityTransform
		);
		console.log(html);
		return html;
	}

	const onFileChange = (event) => {
		const file = event.target.files[0];
		const form = new FormData();
		form.append('file', file);
		axios.post('https://localhost:5001/api/export/convert', form, {
			headers: {
				'Content-Type': 'multipart/form-data',
			}
		}).then(res => {
			const html = res.data;
			const blocksFromHTML = convertFromHTML(html);
			const state = ContentState.createFromBlockArray(
				blocksFromHTML.contentBlocks,
				blocksFromHTML.entityMap,
			);
			setEditorState(EditorState.createWithContent(state));
		}
		).catch(err => console.log(err));

	};

	return (
		<div className="App" >
			<div className="RichEditor-root">
				<BlockStyleControls
					editorState={editorState}
					onToggle={toggleBlockType}
				/>
				<InlineStyleControls
					editorState={editorState}
					onToggle={toggleInlineStyle}
				/>
				<div className='RichEditor-controls'>
					<div className="RichEditor-editor">
						<Editor
							editorState={editorState}
							handleKeyCommand={handleKeyCommand}
							onChange={setEditorState}
							placeholder="Enter some text..."
							spellCheck={true}
						/>
					</div>
					<div>
						<div
							style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
						>
							<button
								className='RichEditor-button'
								onClick={() => setEditorState(EditorState.createEmpty())}>Clear</button>
							<button
								className='RichEditor-button'
								onClick={() => handleSave()}>Save</button>
						</div>
						<form
							method="post"
							action="https://localhost:5001/api/export/convert"
							encType="multipart/form-data"
						>
							<label htmlFor="file">Upload file raw:</label>
							<input type="file" name="file" onChange={onFileChange} />
						</form>

					</div>
				</div>

			</div>
		</div >
	);
}

export default App;



import { Editor } from "obsidian";
import { diff_match_patch, DIFF_INSERT, DIFF_DELETE } from "diff-match-patch";
import dedent from "ts-dedent";

const generatedTagsRegex =
	/%% generate tags start %%([\s\S]*?)%% generate tags end %%/gm;
const generateText = (tags: string[]) => {
	return dedent`
	%% generate tags start %%
	${tags.map((tag) => `${tag}`).join(" ")}
	%% generate tags end %%
	`;
};
/**
 * given a string, get all the tags that are generated
 */
export function getTagsFromGeneratedText(str: string) {
	const matches = generatedTagsRegex.exec(str);
	if (matches) {
		const tagsStr = matches[1].trim();
		const tags = tagsStr.split(/\s+/);
		return tags;
	} else {
		return [];
	}
}
/**
 * given a tag, bread down the tag to its parents
 * @example #a/b/c -> #a #a/b
 */
export function breakdownTag(tag: string) {
	const splitTag = tag.split("/");
	// get all the parents of the tag except the last one
	const tags = splitTag
		.map((_, index) => {
			return splitTag.slice(0, index + 1).join("/");
		})
		.slice(0, -1);

	return tags;
}
export function createNewText(oldText: string, generatedTags: string[]) {
	const generatedText = generateText(generatedTags);
	// look for the generated text in the file, if it exists, replace it, otherwise add it below the front matter
	const firstTryReplaceResult = oldText.replace(
		generatedTagsRegex,
		generatedText
	);

	const parts = oldText.split(/^---$/m);
	const frontmatter = parts[1].trim();
	const body = parts[2].trim();

	const newBody = `${generatedText}\n\n${body}`;

	// Write the updated content back to the file
	const newContent = `---\n${frontmatter}\n---\n\n${newBody}`;
	return firstTryReplaceResult.includes(generatedText)
		? firstTryReplaceResult
		: newContent;
}
export function writeFile(editor: Editor, oldText: string, newText: string) {
	const dmp = new diff_match_patch();
	const changes = dmp.diff_main(oldText, newText);
	let curText = "";
	changes.forEach((change) => {
		function endOfDocument(doc: string) {
			const lines = doc.split("\n");
			return {
				line: lines.length - 1,
				ch: lines[lines.length - 1].length,
			};
		}

		const [type, value] = change;

		if (type == DIFF_INSERT) {
			editor.replaceRange(value, endOfDocument(curText));
			curText += value;
		} else if (type == DIFF_DELETE) {
			const start = endOfDocument(curText);
			let tempText = curText;
			tempText += value;
			const end = endOfDocument(tempText);
			editor.replaceRange("", start, end);
		} else {
			curText += value;
		}
	});
}

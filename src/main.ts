import { Editor, MarkdownView, Plugin, TFile } from "obsidian";
import {
	getTagsFromGeneratedText as getGeneratedTagsFromText,
	breakdownTag,
	createNewText,
	generatedTagsRegex,
} from "./getTagsFromGeneratedText";
import { writeFile } from "./writeFile";
import { getDataFromTextSync } from "./utils/obsidian";

enum YamlKey {
	IGNORE = "tag-gen-ignore",
}

export default class TagGeneratorPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "run-file",
			name: "Generate Tags on current file",
			editorCheckCallback: this.runFile.bind(this),
		});
	}

	runFile(checking: boolean, editor: Editor, ctx: MarkdownView) {
		if (!ctx.file) return;
		if (checking) {
			return isMarkdownFile(ctx.file);
		}
		const oldText = editor.getValue();
		const data = getDataFromTextSync(oldText);

		if (data.yamlObj && data.yamlObj[YamlKey.IGNORE]) return;

		// recognise the pattern, and get all the generated tags
		const generatedTags = getGeneratedTagsFromText(oldText);

		// need to ignore YAML when getting regex matches to avoid improper matches with YAML contents
		// https://github.com/platers/obsidian-linter/issues/661
		const nonGeneratedTags: string[] = data.tags.filter(
			(tag) => !generatedTags.includes(tag)
		);

		// bread down the tag to its parents, #a/b/c -> #a #a/b
		const newGeneratedTags = nonGeneratedTags
			.map(breakdownTag)
			.flat()
			// remove duplicate
			.filter((tag, index, self) => {
				return self.indexOf(tag) === index;
			})
			// if the tag is already in the file, remove it
			.filter((tag) => !nonGeneratedTags.includes(tag))
			.sort();

		const newText =
			newGeneratedTags.length === 0
				? oldText.replace(generatedTagsRegex, "")
				: createNewText(oldText, data, newGeneratedTags);
		writeFile(editor, oldText, newText);
	}
}
function isMarkdownFile(file: TFile) {
	return file.extension === "md";
}

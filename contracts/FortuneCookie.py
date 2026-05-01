# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class FortuneCookie(gl.Contract):
    owner: gl.Address
    total_opened: u64

    def __init__(self):
        self.owner = gl.message.sender_address
        self.total_opened = u64(0)

    @gl.public.write.payable
    def open_cookie(self, keyword: str) -> dict:
        prompt = f"""You are an ancient fortune cookie oracle. A person has opened a fortune cookie while focusing on the word or theme: "{keyword if keyword.strip() else 'the unknown'}"

Generate a single fortune for them. It must be:
- Maximum 15 words
- Meaningful, poetic, and slightly mysterious
- Relevant to their theme if one was given
- Never generic or cliché

Also assign a rarity tier based on how profound, rare, and powerful this fortune feels:
- NORMAL: a solid, grounded insight (most common)
- RARE: a striking observation that feels personally true
- UNIQUE: a perspective-shifting, almost eerie insight
- LEGENDARY: a once-in-a-lifetime message (assign very sparingly, maybe 1 in 20)

Respond ONLY with valid JSON, no extra text:
{{"rarity": "NORMAL", "message": "Your fortune text here."}}"""

        def leader_fn():
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            my_result = leader_fn()
            return my_result["rarity"] == leaders_res.calldata["rarity"]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        self.total_opened += u64(1)

        return {
            "rarity": result["rarity"],
            "message": result["message"],
            "cookie_number": int(self.total_opened),
        }

    @gl.public.view
    def get_total_opened(self) -> u64:
        return self.total_opened

    @gl.public.view
    def get_owner(self) -> str:
        return str(self.owner)

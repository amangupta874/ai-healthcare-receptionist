from typing import Optional, List, Any
from pydantic import BaseModel, Field

class TelegramUser(BaseModel):
    id: int
    is_bot: bool = False
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None

class TelegramChat(BaseModel):
    id: int
    type: str
    title: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None

class InlineKeyboardButton(BaseModel):
    text: str
    callback_data: str

class InlineKeyboardMarkup(BaseModel):
    inline_keyboard: List[List[InlineKeyboardButton]]

class TelegramDocument(BaseModel):
    file_id: str
    file_unique_id: str
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None

class TelegramMessage(BaseModel):
    message_id: int
    from_user: Optional[TelegramUser] = Field(default=None, alias="from")
    chat: TelegramChat
    date: int
    text: Optional[str] = None
    document: Optional[TelegramDocument] = None

class TelegramCallbackQuery(BaseModel):
    id: str
    from_user: TelegramUser = Field(alias="from")
    message: Optional[TelegramMessage] = None
    data: Optional[str] = None

class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[TelegramMessage] = None
    callback_query: Optional[TelegramCallbackQuery] = None

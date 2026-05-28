from flask import request
from flask_limiter.util import get_remote_address


def remote_address_key() -> str:
    return get_remote_address()


def authenticated_user_key() -> str:
    user = getattr(request, 'current_user', None)
    user_id = getattr(user, 'id', 'anonymous')
    return f'{get_remote_address()}:{user_id}'